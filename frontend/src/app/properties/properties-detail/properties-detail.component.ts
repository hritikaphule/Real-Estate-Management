import { Location } from '@angular/common';
import { Component, computed, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, PopoverController, ToastController } from '@ionic/angular';

import { Property } from 'src/app/shared/interface/property';
import { PropertiesService } from '../properties.service';
import { ActionPopupComponent } from 'src/app/shared/components/action-popup/action-popup.component';
import { PropertiesEditComponent } from '../properties-edit-modal/properties-edit.component';
import { PropertiesUploadsComponent } from '../properties-uploads-modal/properties-uploads.component';
import { UserService } from 'src/app/user/user.service';
import { PropertiesGalleryComponent } from '../properties-gallery/properties-gallery.component';
import { TransactionType } from 'src/app/shared/enums/property';

@Component({
  selector: 'app-properties-detail',
  templateUrl: './properties-detail.component.html',
  styleUrls: ['./properties-detail.component.scss'],
})
export class PropertiesDetailComponent implements OnInit {
  @ViewChild('propertiesGallery') propertiesGallery: PropertiesGalleryComponent;
  public property = signal<Property>(undefined);
  public ready = signal(false);
  public isOwner = computed(() => this.userService.isPropertyOwner(this.property()));
  public transactionType = TransactionType;

  constructor(
    public location: Location,
    private userService: UserService,
    private router: Router,
    private propertiesService: PropertiesService,
    private popoverCtrl: PopoverController,
    public modalController: ModalController,
    private toastCtrl: ToastController,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    const paramId = this.route.snapshot.paramMap.get('id');
    this.setPropertyDetails(paramId);
  }

  public async actionPopup() {
    const popover = await this.popoverCtrl.create({
      component: ActionPopupComponent,
      componentProps: {
        message: false,
        edit: this.isOwner(),
        delete: this.isOwner(),
      },
      translucent: true,
    });
    await popover.present();
    const { data } = await popover.onDidDismiss();
    if (!data) {
      return;
    }
    if (data.action === 'delete') {
      this.deleteProperty(this.property().property_id)
    }
    if (data.action === 'edit') {
      this.editModal();
    }
    if (data.action === 'report') {
      const toast = await this.toastCtrl.create({
        message: 'Success, we will take a look at this property.',
        color: 'danger',
        duration: 5000
      });
      toast.present();
    }
  }

  public findInMap() {
    const { lat, lng } = this.property().position;
    this.router.navigate(['/map'], { queryParams: { lat, lng } });
  }

  public async editImages() {
    const modal = await this.modalController.create({
      component: PropertiesUploadsComponent,
      componentProps: {
        property: this.property(),
      },
    });
    modal.present();
    modal.onDidDismiss().then(res => {
      const deleted = res.data?.deleted || [];
      if (deleted) {
        this.property.update(value => {
          value.images = value.images.filter(image => !deleted.includes(image));
          return value;
        });
      }
    });
  }

  private setPropertyDetails(id: string): void {
    this.propertiesService.fetchProperty(id).then((res) => {
      if (res.status === 200) {
        this.property.set(res.data);
        if (this.propertiesGallery) {
          this.propertiesGallery.setImage();
        }
      }
    }).finally(() => this.ready.set(true))
  }

  private async deleteProperty(id: string): Promise<void> {
    const res = await this.propertiesService.removeProperty(id);
    if (res.status === 200) {
      this.propertiesService.removePropertyFromState(id);
      const toast = await this.toastCtrl.create({
        message: res.message,
        color: res.status === 200 ? 'success' : 'danger',
        duration: 4000
      });
      toast.present();
      this.router.navigate(['/properties']);
    }
  }

  private async editModal() {
    const modal = await this.modalController.create({
      component: PropertiesEditComponent,
      componentProps: {
        property: this.property()
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data.property) {
      this.property.set(data.property);
    }
  }
}
